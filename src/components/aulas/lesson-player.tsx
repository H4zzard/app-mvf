import Image from "next/image";
import { Clock, Lock, PlugZap, VideoOff } from "lucide-react";
import type { ContentAvailability, MediaRef } from "@/types/catalog";
import { playbackState } from "@/lib/catalog/media";

/**
 * Área do vídeo da aula. Nunca recebe URL privada: decide pelo `playbackState`.
 * - YouTube/Vimeo (ID público): incorpora com modo de privacidade.
 * - Kiwify ou arquivo próprio: “integração pendente” até haver link assinado no servidor.
 * - Sem vídeo ou em breve: estado profissional, sem mídia fictícia.
 */
export function LessonPlayer({ media, availability, cover, title }: { media: MediaRef; availability: ContentAvailability; cover: string; title: string }) {
  const p = playbackState(media, availability);
  if (p.state === "embed") {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-ink shadow-raised">
        <iframe
          src={p.src}
          title={`Vídeo: ${title}`}
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full"
        />
      </div>
    );
  }
  const copy =
    p.state === "em_breve"
      ? { icon: Clock, title: "Esta aula será liberada em breve", body: "Ela já faz parte do catálogo e aparece aqui assim que for publicada." }
      : p.state === "integracao_pendente"
        ? { icon: PlugZap, title: "Vídeo em integração", body: "O vídeo desta aula está cadastrado e será exibido aqui após a integração segura com a plataforma de vídeo." }
        : { icon: VideoOff, title: "Vídeo de exemplo ainda não adicionado", body: "As aulas oficiais continuam na área de membros atual até a migração." };
  const Icon = copy.icon;
  return (
    <div className="relative grid aspect-video w-full place-items-center overflow-hidden rounded-2xl bg-ink text-center text-paper shadow-raised">
      <Image src={cover} alt="" fill sizes="(max-width: 1024px) 100vw, 700px" className="scale-110 object-cover opacity-30 blur-md" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgb(164_5_45/0.35),rgb(164_5_45/0.85))]" />
      <div className="relative px-6">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-paper/12 ring-1 ring-paper/25 backdrop-blur">
          <Icon aria-hidden className="size-6" />
        </span>
        <p className="mt-3 font-serif text-lg font-semibold">{copy.title}</p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-on-wine-muted">{copy.body}</p>
        {p.state === "integracao_pendente" ? (
          <p className="mt-2 inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-wider text-on-wine-muted">
            <Lock aria-hidden className="size-3" /> Acesso protegido
          </p>
        ) : null}
      </div>
    </div>
  );
}
