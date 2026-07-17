import { notFound } from "next/navigation";
import { TOPICS } from "@/lib/data/topics";
import { TopicView } from "./topic-view";

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!TOPICS.some((t) => t.slug === slug)) notFound();
  return <TopicView slug={slug} />;
}
