import { Advantages } from "@/components/sections/advantages";
import { Categories } from "@/components/sections/categories";
import { Certificates } from "@/components/sections/certificates";
import { Consultation } from "@/components/sections/consultation";
import { Hero } from "@/components/sections/hero";
import { Partners } from "@/components/sections/partners";
import { Products } from "@/components/sections/products";
import { Reviews } from "@/components/sections/reviews";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Categories />
      <Advantages />
      <Certificates />
      <Products />
      <Reviews />
      <Partners />
      <Consultation />
    </>
  );
}
