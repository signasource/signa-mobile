import { coursesApi, CourseSummary } from "@/features/courses/api";

/** Catalog of the user's sign language (LSA). Never throws: returns `[]` on any failure. */
export async function fetchCatalog(): Promise<CourseSummary[]> {
  try {
    const { data: languages } = await coursesApi.getSignLanguages();
    const lsa = languages.find((l) => l.code === "LSA") ?? languages[0];
    if (!lsa) return [];
    const { data: catalog } = await coursesApi.getCatalog(lsa.id);
    return catalog.content;
  } catch {
    return [];
  }
}
