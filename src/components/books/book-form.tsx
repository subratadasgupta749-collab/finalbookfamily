import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  nickname: z.string().trim().max(100).optional(),
  gender: z.string().trim().max(50).optional(),
  date_of_birth: z.string().trim().optional(),
  country: z.string().trim().max(100).optional(),
  relationship: z.string().trim().max(100).optional(),
});

export type BookFormValues = z.infer<typeof schema>;

const RELATIONSHIPS = [
  "Mother",
  "Father",
  "Grandmother",
  "Grandfather",
  "Spouse",
  "Sibling",
  "Child",
  "Aunt",
  "Uncle",
  "Self",
  "Other",
];

const GENDERS = ["Male", "Female", "Other"];

interface Props {
  initial?: BookFormValues;
  onSubmit: (values: BookFormValues) => void;
  submitting?: boolean;
  submitLabel: string;
}

export function BookForm({ initial, onSubmit, submitting, submitLabel }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? {
      name: "",
      nickname: "",
      gender: "",
      date_of_birth: "",
      country: "",
      relationship: "",
    },
  });

  const gender = watch("gender");
  const relationship = watch("relationship");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">
          Full name <span className="text-destructive">*</span>
        </Label>
        <Input id="name" {...register("name")} placeholder="e.g. Margaret Anne Wilson" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nickname">Nickname</Label>
          <Input id="nickname" {...register("nickname")} placeholder="e.g. Maggie" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select value={gender || ""} onValueChange={(v) => setValue("gender", v)}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of birth</Label>
          <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input id="country" {...register("country")} placeholder="e.g. United Kingdom" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="relationship">Relationship to you</Label>
          <Select
            value={relationship || ""}
            onValueChange={(v) => setValue("relationship", v)}
          >
            <SelectTrigger id="relationship">
              <SelectValue placeholder="Select relationship" />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
