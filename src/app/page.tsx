import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/dashboard");
  } else {
    redirect("/dashboard");
  }
}
