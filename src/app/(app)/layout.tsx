import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <>
      <AppNav />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</div>
    </>
  );
}
