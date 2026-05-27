import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

/** Semantic intents: green CTA, blue sign-in, red danger, yellow warning */
export type RyvoIntent = "cta" | "signIn" | "danger" | "warning" | "outline" | "ghost";

const intentMap = {
  cta: "default",
  signIn: "info",
  danger: "destructive",
  warning: "warning",
  outline: "outline",
  ghost: "ghost",
} as const;

type RyvoButtonProps = ComponentProps<typeof Button> & {
  intent?: RyvoIntent;
};

export function RyvoButton({ intent = "cta", variant, ...props }: RyvoButtonProps) {
  return <Button variant={variant ?? intentMap[intent]} {...props} />;
}
