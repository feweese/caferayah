import Image from "next/image";
import { MainLayout } from "@/components/layout/main-layout";

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="container py-16 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-3xl font-bold mb-2">About Caférayah</h1>
          <p className="text-muted-foreground text-center max-w-2xl">
            Where every sip brews a story
          </p>
        </div>

        <div className="mb-16">
          <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold">Our Story</h2>
            <p className="text-muted-foreground">
              Founded in March 2024 by Romiel Ambrosio & Aaliyah Aligada, Caférayah was born from a passion 
              for exceptional coffee and the desire to create a space where community and quality converge.
            </p>
            <p className="text-muted-foreground">
              Located in the heart of Pateros, Metro Manila, our café has quickly become a favorite destination 
              for locals and visitors alike. We pride ourselves on sourcing the finest beans and ingredients 
              to craft beverages that delight and inspire.
            </p>
            <p className="text-muted-foreground">
              Our name, Caférayah, represents the fusion of coffee culture with local Filipino heritage, 
              reflecting our commitment to creating a unique experience that honors tradition while embracing innovation.
            </p>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-4">Quality</h3>
              <p className="text-muted-foreground">
                We source the highest quality beans and ingredients, and our baristas are trained 
                to prepare each beverage with precision and care.
              </p>
            </div>
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-4">Community</h3>
              <p className="text-muted-foreground">
                We believe in creating a welcoming space where people can connect, work, 
                and enjoy moments of respite in their busy lives.
              </p>
            </div>
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-4">Sustainability</h3>
              <p className="text-muted-foreground">
                We are committed to environmentally conscious practices, from our choice 
                of suppliers to our packaging and waste management. 
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-8 text-center">Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-48 w-48 mb-4">
                <Image
                  src="https://placehold.co/500x500/brown/white?text=Romiel"
                  alt="Romiel Ambrosio"
                  fill
                  className="object-cover rounded-full"
                />
              </div>
              <h3 className="font-bold text-lg">Romiel Ambrosio</h3>
              <p className="text-primary font-medium mb-3">Co-founder</p>
              <p className="text-muted-foreground max-w-md">
                A coffee enthusiast with a background in business management, Romiel brings 
                his passion for quality and innovation to every aspect of Caférayah.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="relative h-48 w-48 mb-4">
                <Image
                  src="https://placehold.co/500x500/brown/white?text=Aaliyah"
                  alt="Aaliyah Aligada"
                  fill
                  className="object-cover rounded-full"
                />
              </div>
              <h3 className="font-bold text-lg">Aaliyah Aligada</h3>
              <p className="text-primary font-medium mb-3">Co-founder</p>
              <p className="text-muted-foreground max-w-md">
                With her culinary background and eye for design, Aaliyah crafts our unique 
                menu offerings and creates the warm, inviting atmosphere of our café.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 