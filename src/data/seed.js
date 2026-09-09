export const seedWorkspace = {
  organization: { id: "org-brightside", name: "Brightside Studio" },
  teams: [
    { id: "design", name: "Design" },
    { id: "marketing", name: "Marketing" },
    { id: "operations", name: "Operations" },
  ],
  users: [
    { id: "u1", organizationId: "org-brightside", name: "Maya Chen", email: "maya@brightside.co", role: "manager", teamId: "operations", color: "coral" },
    { id: "u2", organizationId: "org-brightside", name: "Jon Bell", email: "jon@brightside.co", role: "employee", teamId: "design", color: "blue" },
    { id: "u3", organizationId: "org-brightside", name: "Amara Okafor", email: "amara@brightside.co", role: "employee", teamId: "marketing", color: "gold" },
    { id: "u4", organizationId: "org-brightside", name: "Luis Rivera", email: "luis@brightside.co", role: "employee", teamId: "design", color: "violet" },
  ],
  tasks: [
    { id: "t1", organizationId: "org-brightside", title: "Finalize homepage concepts", description: "Prepare the strongest two directions for client review.", assigneeId: "u2", createdById: "u1", teamId: "design", due: "2026-09-11", priority: "high", status: "progress", createdAt: "2026-09-07T15:00:00.000Z" },
    { id: "t2", organizationId: "org-brightside", title: "Draft September newsletter", description: "Include the fall launch and customer spotlight.", assigneeId: "u3", createdById: "u1", teamId: "marketing", due: "2026-09-14", priority: "medium", status: "todo", createdAt: "2026-09-08T14:00:00.000Z" },
    { id: "t3", organizationId: "org-brightside", title: "Update icon library", description: "Normalize sizing and export the remaining product icons.", assigneeId: "u4", createdById: "u1", teamId: "design", due: "2026-09-09", priority: "low", status: "done", createdAt: "2026-09-05T17:30:00.000Z" },
    { id: "t4", organizationId: "org-brightside", title: "Q4 planning agenda", description: "Collect talking points from each team lead.", assigneeId: "u1", createdById: "u1", teamId: "operations", due: "2026-09-16", priority: "high", status: "todo", createdAt: "2026-09-09T13:00:00.000Z" },
    { id: "t5", organizationId: "org-brightside", title: "Campaign performance recap", description: "Summarize results and recommended next steps.", assigneeId: "u3", createdById: "u1", teamId: "marketing", due: "2026-09-10", priority: "medium", status: "progress", createdAt: "2026-09-06T16:00:00.000Z" },
  ],
};
