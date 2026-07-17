import { CORE_TOPICS } from "./topics-core";
import { ADVANCED_TOPICS } from "./topics-advanced";
import type { Topic } from "./topic-types";

export type { Topic, TopicExample, QuizQ, Level } from "./topic-types";

export const TOPICS: Topic[] = [...CORE_TOPICS, ...ADVANCED_TOPICS];

export const TOPIC_BY_SLUG = new Map(TOPICS.map((t) => [t.slug, t]));

export const TOPIC_CATEGORIES = [...new Set(TOPICS.map((t) => t.category))];

export function topicsByCategory(): { category: string; topics: Topic[] }[] {
  return TOPIC_CATEGORIES.map((category) => ({
    category,
    topics: TOPICS.filter((t) => t.category === category),
  }));
}
