import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { BookForm, type BookFormValues } from "@/components/books/book-form";
import { createBook } from "@/lib/books.functions";

export const Route = createFileRoute("/_authenticated/_app/books/new")({
  head: () => ({
    meta: [
      { title: "New Book — My Family History Book" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewBookPage,
});

function NewBookPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createBook);

  const mutation = useMutation({
    mutationFn: (values: BookFormValues) => createFn({ data: values }),
    onSuccess: (book) => {
      toast.success("Book created — let's start the interview");
      queryClient.invalidateQueries({ queryKey: ["books"] });
      router.navigate({ to: "/books/$bookId/interview", params: { bookId: book.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/books"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to books
      </Link>

      <div className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Whose story are you preserving?
        </h1>
        <p className="mt-1 text-muted-foreground">
          Fill in a few basic details. You can edit or add more anytime.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
        <BookForm
          onSubmit={(v) => mutation.mutate(v)}
          submitting={mutation.isPending}
          submitLabel="Start Interview"
        />
      </div>
    </div>
  );
}
