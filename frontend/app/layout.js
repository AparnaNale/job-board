import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata = {
  title: "ProjectBoard — Project-Based Hiring",
  description: "AI-powered job discovery across LinkedIn, Naukri, Indeed and Internshala.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-body bg-paper text-ink min-h-screen">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
