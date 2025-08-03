import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import User from "@/model/users"
import { connectToDatabase } from "@/lib/mongodb"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Google OAuth Provider
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    
    // Keep existing credentials provider for backward compatibility
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          await connectToDatabase();
          const user = await User.findOne({ username: credentials.username }).select("+password");
          
          if (!user) {
            return null;
          }

          const isMatch = await user.comparePassword(credentials.password);
          if (!isMatch) {
            return null;
          }

          return {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          await connectToDatabase();
          
          // Check if user already exists
          let existingUser = await User.findOne({ email: user.email });
          
          if (!existingUser) {
            // Create new user from Google OAuth
            // Generate a clean username from email
            const emailPrefix = user.email.split('@')[0];
            const cleanUsername = emailPrefix.replace(/[^a-zA-Z0-9]/g, '') + '_google';
            
            existingUser = new User({
              username: cleanUsername,
              email: user.email,
              password: Math.random().toString(36).slice(-16), // 16 character random password for OAuth users
              role: 'user',
              oauthProvider: 'google',
              oauthId: account.providerAccountId,
            });
            await existingUser.save();
          }
          
          // Update user object with database info
          user.id = existingUser._id.toString();
          user.username = existingUser.username;
          user.role = existingUser.role;
          
          return true;
        } catch (error) {
          console.error("Google OAuth sign-in error:", error);
          return false;
        }
      }
      
      return true;
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.username = token.username;
      session.user.id = token.sub;
      return session;
    }
  },
  
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  secret: process.env.NEXTAUTH_SECRET,
});
