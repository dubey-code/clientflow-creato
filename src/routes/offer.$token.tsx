import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getOffer } from "@/lib/projects.functions";
import { OfferView } from "@/components/OfferView";

export const Route = createFileRoute("/offer/$token")({
  loader: async ({ params }) => {
    if (!/^[a-f0-9]{36}$/.test(params.token)) return null;
    return getOffer({ data: { token: params.token } });
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.offer ? loaderData.offer.headline : "Коммерческое предложение" },
      { name: "description", content: loaderData?.offer?.subtitle ?? "Персональное коммерческое предложение." },
      { property: "og:title", content: loaderData?.offer?.headline ?? "Коммерческое предложение" },
      { property: "og:description", content: loaderData?.offer?.subtitle ?? "Персональное коммерческое предложение." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OfferPage,
});

function OfferPage() {
  const data = Route.useLoaderData();
  const { token } = Route.useParams();
  const router = useRouter();
  const pending = data && !data.offer && data.status === "submitted";
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => router.invalidate(), 4000);
    return () => clearInterval(t);
  }, [pending, router]);

  if (!data) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Предложение не найдено</div>;
  if (!data.offer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        {pending && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
        <h1 className="text-2xl font-semibold">{pending ? "Готовим ваше предложение…" : "Предложение пока не готово"}</h1>
        <p className="text-muted-foreground">Мы свяжемся с вами, как только оно будет готово.</p>
      </div>
    );
  }
  return <OfferView offer={data.offer} title={data.title} company={data.contact?.company} contact={data.contact} token={token} />;
}
