"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import ForumCard from "@/components/forum/ForumCard";
import CreateForumModal from "@/components/forum/CreateForumModel";
import { Button } from "@/components/ui/button";

function LoginSuccessModal({ loginInfo, lastLogin, securityInfo, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Login Successful</h3>
        
        {loginInfo && (
          <div className="mb-3 p-3 bg-green-50 rounded">
            <p className="text-sm text-green-800 font-medium">Welcome back!</p>
            <p className="text-sm text-green-700">{loginInfo.message}</p>
          </div>
        )}
        
        {lastLogin && (
          <div className="mb-3 p-3 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">{lastLogin.message}</p>
          </div>
        )}
        
        {securityInfo && securityInfo.hasFailedAttempts && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800 font-medium">Security Alert</p>
            <p className="text-sm text-yellow-700">{securityInfo.message}</p>
          </div>
        )}
        
        <Button onClick={onClose} className="w-full">
          Continue
        </Button>
      </div>
    </div>
  );
}

export default function ForumIndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [forums, setForums] = useState([]);
  const [isLoadingForums, setIsLoadingForums] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginSuccessData, setLoginSuccessData] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    // Check for login success data in sessionStorage
    if (user) {
      const loginData = sessionStorage.getItem('loginSuccessData');
      if (loginData) {
        try {
          const parsedData = JSON.parse(loginData);
          setLoginSuccessData(parsedData);
          setShowLoginModal(true);
          // Clear the data after using it
          sessionStorage.removeItem('loginSuccessData');
        } catch (error) {
          console.error('Failed to parse login success data:', error);
        }
      }
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      fetchForums();
    }
  }, [user]);

  async function fetchForums() {
    setIsLoadingForums(true);
    try {
      const res = await fetch("/api/forums");
      const data = await res.json();
      if (res.ok) {
        setForums(data.data); // `data` from { data: forums }
      } else {
        console.error("Failed to fetch forums:", data.error);
      }
    } catch (err) {
      console.error("Error fetching forums:", err);
    } finally {
      setIsLoadingForums(false);
    }
  }

  async function handleForumThread(title, content) {
    try {
      const res = await fetch("/api/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, description: content }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create forum");
        return;
      }

      // Re-fetch forums after creation
      fetchForums();
    } catch (err) {
      console.error("Error creating forum:", err);
      alert("Failed to create forum");
    }
  }

  if (loading || isLoadingForums) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-center text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Forums</h1>
        <CreateForumModal onCreate={handleForumThread} />
      </div>

      {forums.length === 0 ? (
        <p className="text-gray-600 italic">No forums yet. Create one!</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {forums.map((forum) => (
            <ForumCard key={forum._id} forum={forum} />
          ))}
        </div>
      )}

      {showLoginModal && loginSuccessData && (
        <LoginSuccessModal 
          loginInfo={loginSuccessData.loginInfo}
          lastLogin={loginSuccessData.lastLogin}
          securityInfo={loginSuccessData.securityInfo}
          onClose={() => {
            setShowLoginModal(false);
            setLoginSuccessData(null);
          }}
        />
      )}
    </main>
  );
}
