import { BecomeWriterDialog } from "@/components/become-writer-dialog";
import { canModerate, currentUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const isWriter = user.isWriter;
  const isAdmin = canModerate(user);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="font-serif text-2xl font-semibold text-text-primary">
        Settings
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Manage your account and writer status.
      </p>

      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-text-primary">Profile</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Username</dt>
              <dd className="font-medium text-text-primary">{user.username}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Role</dt>
              <dd className="font-medium text-text-primary">{user.role}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Writer</dt>
              <dd className="font-medium text-text-primary">
                {isWriter ? "Yes" : "No"}
              </dd>
            </div>
          </dl>
        </div>

        <BecomeWriterDialog isWriter={isWriter} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
