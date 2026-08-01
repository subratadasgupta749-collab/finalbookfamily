import { createFileRoute } from "@tanstack/react-router";
import { PostEditor } from "@/components/blog/post-editor";

export const Route = createFileRoute("/_authenticated/_admin/admin/blog/$postId")({
  component: RouteComp,
});

function RouteComp() {
  const { postId } = Route.useParams();
  return <PostEditor mode="edit" postId={postId} />;
}
