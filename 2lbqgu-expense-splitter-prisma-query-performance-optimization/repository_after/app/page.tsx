import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getOrCreateDemoUser() {
  let user = await prisma.user.findUnique({
    where: { email: "demo@example.com" },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "demo@example.com",
        name: "Demo User",
      },
    });
  }

  return user;
}

async function getUserGroups(userId: string) {
  return prisma.group.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    include: {
      members: {
        include: { user: true },
      },
      _count: {
        select: { expenses: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export default async function HomePage() {
  const user = await getOrCreateDemoUser();
  const groups = await getUserGroups(user.id);

  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Expense Splitter
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          Logged in as: <span className="font-semibold">{user.name}</span> (
          {user.email})
        </p>
        <p className="text-gray-500">
          Split expenses fairly with friends and groups
        </p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800">Your Groups</h2>
        <Link
          href="/groups/new"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
        >
          + Create Group
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 mb-4">
            You don&apos;t have any groups yet.
          </p>
          <Link
            href="/groups/new"
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Create your first group →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group: any) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {group.name}
              </h3>
              {group.description && (
                <p className="text-gray-500 text-sm mb-4">
                  {group.description}
                </p>
              )}
              <div className="flex justify-between text-sm text-gray-500">
                <span>{group.members.length} members</span>
                <span>{group._count.expenses} expenses</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
