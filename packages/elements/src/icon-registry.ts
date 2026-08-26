import {
  Check,
  CircleQuestionMark,
  ExternalLink,
  Info,
  Search,
  TriangleAlert,
  type LucideIconData
} from "@lucide/icons";
import { IconName } from "@unislang/unifold-catalog";

const icons: Readonly<Record<IconName, LucideIconData>> = Object.freeze({
  [IconName.Check]: Check,
  [IconName.ExternalLink]: ExternalLink,
  [IconName.Help]: CircleQuestionMark,
  [IconName.Info]: Info,
  [IconName.Search]: Search,
  [IconName.Warning]: TriangleAlert
});

export function getCoreIcon(name: string): LucideIconData {
  return icons[name as IconName] ?? Info;
}
