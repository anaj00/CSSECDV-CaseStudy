export async function PATCH(req, { params }) {
  const { id } = params;
  const { lock } = await req.json(); // true or false

  const user = await getUserFromCookie(req);
  if (!user || !["admin", "moderator"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const forum = await Forum.findById(id);
  if (!forum)
    return NextResponse.json({ error: "Forum not found" }, { status: 404 });

  // Moderators must be assigned
  if (
    user.role === "moderator" &&
    !forum.assignedModerators.includes(user.id)
  ) {
    return NextResponse.json(
      { error: "Not assigned to moderate this forum" },
      { status: 403 }
    );
  }

  forum.locked = lock;
  await forum.save();

  return NextResponse.json({ success: true, data: forum });
}
