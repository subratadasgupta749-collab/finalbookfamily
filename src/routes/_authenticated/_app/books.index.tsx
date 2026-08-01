import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Copy,
  Pencil,
  Clock,
  MoreVertical,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listBooks, deleteBook, duplicateBook } from "@/lib/books.functions";

const booksQueryOptions = queryOptions({
  queryKey: ["books"],
  queryFn: () => listBooks(),
});

export const Route = createFileRoute("/_authenticated/_app/books/")({
  head: () => ({
    meta: [
      { title: "My Books — My Family History Book" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BooksPage,
});

function statusLabel(s: string) {
  if (s === "draft") return "Draft";
  if (s === "in_progress") return "In progress";
  if (s === "completed") return "Completed";
  return s;
}

function statusVariant(s: string): "secondary" | "default" | "outline" {
  if (s === "completed") return "default";
  if (s === "in_progress") return "secondary";
  return "outline";
}

function BooksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: books = [], isLoading } = useQuery(booksQueryOptions);

  const deleteFn = useServerFn(deleteBook);
  const duplicateFn = useServerFn(duplicateBook);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Book deleted");
      queryClient.invalidateQueries({ queryKey: ["books"] });
      router.invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Book duplicated");
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const q = search.trim().toLowerCase();
  const filtered = q
    ? books.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.nickname ?? "").toLowerCase().includes(q) ||
          (b.relationship ?? "").toLowerCase().includes(q),
      )
    : books;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My Books</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage your family history books.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/books/new">
            <Plus className="mr-2 h-4 w-4" /> New Book
          </Link>
        </Button>
      </div>

      <div className="mt-6 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, nickname or relationship"
          className="pl-9"
        />
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="rounded-2xl border border-border/60 bg-background p-10 text-center text-muted-foreground">
            Loading your books…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasBooks={books.length > 0} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((book) => (
              <div
                key={book.id}
                className="group flex flex-col rounded-2xl border border-border/60 bg-background p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to="/books/$bookId"
                    params={{ bookId: book.id }}
                    className="flex min-w-0 items-start gap-3"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold group-hover:text-primary">
                        {book.name}
                      </h3>
                      {book.relationship && (
                        <p className="truncate text-xs text-muted-foreground">
                          {book.relationship}
                        </p>
                      )}
                    </div>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          router.navigate({ to: "/books/$bookId", params: { bookId: book.id } })
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateMutation.mutate(book.id)}>
                        <Copy className="mr-2 h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setPendingDelete({ id: book.id, name: book.name })}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Badge variant={statusVariant(book.status)}>{statusLabel(book.status)}</Badge>
                  <span className="text-xs text-muted-foreground">{book.progress}%</span>
                </div>
                <Progress value={book.progress} className="mt-2 h-1.5" />

                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last edited {formatDistanceToNow(new Date(book.updated_at), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ hasBooks }: { hasBooks: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-background p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BookOpen className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">
        {hasBooks ? "No matching books" : "Start your first book"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasBooks
          ? "Try a different search term."
          : "Create a family history book to preserve stories, milestones, and memories for generations to come."}
      </p>
      {!hasBooks && (
        <Button asChild className="mt-6">
          <Link to="/books/new">
            <Plus className="mr-2 h-4 w-4" /> Create your first book
          </Link>
        </Button>
      )}
    </div>
  );
}
