import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookForm, type BookFormValues } from "@/components/books/book-form";
import { getBook, updateBook } from "@/lib/books.functions";

const bookQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["books", id],
    queryFn: () => getBook({ data: { id } }),
  });

export const Route = createFileRoute("/_authenticated/_app/books/$bookId/")({
  head: () => ({
    meta: [
      { title: "Book — My Family History Book" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookDetailPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border/60 bg-background p-8 text-center">
      <p className="text-muted-foreground">{error.message}</p>
      <Link to="/books" className="mt-4 inline-block text-primary hover:underline">
        Back to books
      </Link>
    </div>
  ),
});

function statusLabel(s: string) {
  if (s === "draft") return "Draft";
  if (s === "in_progress") return "In progress";
  if (s === "completed") return "Completed";
  return s;
}

function BookDetailPage() {
  const { bookId } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: book, isLoading } = useQuery(bookQueryOptions(bookId));

  const updateFn = useServerFn(updateBook);
  const mutation = useMutation({
    mutationFn: (values: BookFormValues) => updateFn({ data: { id: bookId, ...values } }),
    onSuccess: () => {
      toast.success("Book updated");
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["books", bookId] });
      router.invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !book) {
    return (
      <div className="mx-auto max-w-2xl text-center text-muted-foreground">Loading…</div>
    );
  }

  const initial: BookFormValues = {
    name: book.name,
    nickname: book.nickname ?? "",
    gender: book.gender ?? "",
    date_of_birth: book.date_of_birth ?? "",
    country: book.country ?? "",
    relationship: book.relationship ?? "",
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/books"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to books
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{book.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Last edited {formatDistanceToNow(new Date(book.updated_at), { addSuffix: true })}
          </div>
        </div>
        <Badge variant={book.status === "completed" ? "default" : "secondary"}>
          {statusLabel(book.status)}
        </Badge>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-background p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="text-muted-foreground">{book.progress}%</span>
        </div>
        <Progress value={book.progress} className="mt-2 h-2" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-5">
          <div>
            <h3 className="font-semibold">AI-guided interview</h3>
            <p className="text-sm text-muted-foreground">
              Answer thoughtful questions across 11 life topics.
            </p>
          </div>
          <Link
            to="/books/$bookId/interview"
            params={{ bookId }}
            className="inline-flex w-fit items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start interview →
          </Link>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-accent/10 to-transparent p-5">
          <div>
            <h3 className="font-semibold">Photo gallery</h3>
            <p className="text-sm text-muted-foreground">
              Upload memories organised by life chapter.
            </p>
          </div>
          <Link
            to="/books/$bookId/photos"
            params={{ bookId }}
            className="inline-flex w-fit items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Open gallery →
          </Link>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 to-transparent p-5">
          <div>
            <h3 className="font-semibold">Manuscript</h3>
            <p className="text-sm text-muted-foreground">
              Turn interview answers into a professional biography with chapters, timeline & quotes.
            </p>
          </div>
          <Link
            to="/books/$bookId/manuscript"
            params={{ bookId }}
            className="inline-flex w-fit items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Open manuscript →
          </Link>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-accent/10 to-transparent p-5">
          <div>
            <h3 className="font-semibold">Preview & Export</h3>
            <p className="text-sm text-muted-foreground">
              Beautiful themed preview. Download as PDF, DOCX, or print-ready PDF.
            </p>
          </div>
          <Link
            to="/books/$bookId/preview"
            params={{ bookId }}
            className="inline-flex w-fit items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Open preview →
          </Link>
        </div>
      </div>


      <div className="mt-6 rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Basic information</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the details about the person this book is about.
        </p>
        <div className="mt-6">
          <BookForm
            initial={initial}
            onSubmit={(v) => mutation.mutate(v)}
            submitting={mutation.isPending}
            submitLabel="Save changes"
          />
        </div>
      </div>
    </div>
  );
}
