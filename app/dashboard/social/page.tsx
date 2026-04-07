import { SocialClient } from "./social-client";
import { getSocialPosts } from "./actions";

export default async function SocialDashboardPage() {
  const posts = await getSocialPosts();

  return <SocialClient posts={posts} />;
}
