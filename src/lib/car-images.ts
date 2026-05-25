import car1 from "@/assets/car-1.jpg";
import car2 from "@/assets/car-2.jpg";
import car3 from "@/assets/car-3.jpg";
import car4 from "@/assets/car-4.jpg";
import car5 from "@/assets/car-5.jpg";
import car6 from "@/assets/car-6.jpg";

export const CAR_IMAGES: Record<string, string> = {
  "mclaren-gt-2022": car1,
  "range-rover-vogue-2023": car2,
  "toyota-supra-2021": car3,
  "rolls-royce-dawn-2020": car4,
  "dodge-challenger-1970": car5,
  "bugatti-chiron-2022": car6,
};

export function getCarImage(id: string, imageUrl?: string | null): string {
  return CAR_IMAGES[id] ?? imageUrl ?? car1;
}
