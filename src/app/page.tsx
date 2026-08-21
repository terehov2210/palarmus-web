import { Advantages } from "@/components/sections/advantages";
import { Assurances } from "@/components/sections/assurances";
import { Categories } from "@/components/sections/categories";
import { Certificates } from "@/components/sections/certificates";
import { Consultation } from "@/components/sections/consultation";
import { EducationTeaser } from "@/components/sections/education-teaser";
import { Hero } from "@/components/sections/hero";
import { Partners } from "@/components/sections/partners";
import { Products } from "@/components/sections/products";
import { Reviews } from "@/components/sections/reviews";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Assurances />
      <Categories />
      <Advantages />
      <Certificates />
      <Products />
      <EducationTeaser />
      <Reviews />
      <Partners />
      <Consultation />
    </>
  );
}
