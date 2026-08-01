import { createFileRoute } from "@tanstack/react-router";
import { PostEditor } from "@/components/blog/post-editor";

export const Route = createFileRoute("/_authenticated/_admin/admin/blog/new")({
  component: () => <PostEditor mode="create" />,
});
