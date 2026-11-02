import { Advantages } from "@/components/sections/advantages";
import { Categories } from "@/components/sections/categories";
import { Certificates } from "@/components/sections/certificates";
import { Consultation } from "@/components/sections/consultation";
import { EducationTeaser } from "@/components/sections/education-teaser";
import { Hero } from "@/components/sections/hero";
import { ModelsTeaser } from "@/components/sections/models-teaser";
import { Partners } from "@/components/sections/partners";
import { Products } from "@/components/sections/products";
import { Reviews } from "@/components/sections/reviews";
import { published } from "@/content/trust";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Categories />
      <ModelsTeaser />
      <Products />
      <Advantages />
      {published.certificates ? <Certificates /> : null}
      <EducationTeaser />
      {published.testimonials ? <Reviews /> : null}
      <Partners />
      <Consultation />
    </>
  );
}
