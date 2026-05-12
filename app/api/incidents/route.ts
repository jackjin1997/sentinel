import { INCIDENTS } from "@/lib/mock/incidents";

export async function GET() {
  return Response.json({ incidents: INCIDENTS });
}
