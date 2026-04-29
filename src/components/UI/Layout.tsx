import type { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="relative h-screen w-screen overflow-hidden text-slate-100">
      <main className="relative h-full w-full">{children}</main>
    </div>
  );
}
