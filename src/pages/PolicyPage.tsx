import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka till startsidan
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Integritetspolicy</h1>
        
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Inledning</h2>
            <p className="text-muted-foreground leading-relaxed">
              OOTD ("vi", "oss", "vårt") respekterar din integritet och är engagerade i att skydda dina personuppgifter. 
              Denna integritetspolicy förklarar hur vi samlar in, använder och skyddar din information när du använder vår tjänst.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information vi samlar in</h2>
            <div className="space-y-3">
              <h3 className="text-lg font-medium">2.1 Information du tillhandahåller</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Klädesbilder som du laddar upp</li>
                <li>Outfit-beskrivningar och preferenser</li>
                <li>Användargenerade innehåll som outfits och kommentarer</li>
              </ul>
              
              <h3 className="text-lg font-medium">2.2 Automatiskt insamlad information</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Användningsdata och interaktionsmönster</li>
                <li>Teknisk information om din enhet och webbläsare</li>
                <li>IP-adress och allmän geografisk plats</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Hur vi använder din information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Tillhandahålla och förbättra våra AI-drivna outfit-rekommendationer</li>
              <li>Analysera klädesbilder för att generera personliga förslag</li>
              <li>Möjliggöra delning av outfits i vår community</li>
              <li>Förbättra användarupplevelsen genom analys av användningsmönster</li>
              <li>Kommunicera med dig om tjänstuppdateringar</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Delning av information</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vi säljer inte din personliga information. Vi kan dela information med:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Tjänsteleverantörer som hjälper oss att driva vår plattform</li>
              <li>AI-tjänster för bildanalys och outfit-generering</li>
              <li>Tredjepartstjänster som Pinterest för inspiration-innehåll</li>
              <li>När det krävs enligt lag eller för att skydda våra rättigheter</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Datasäkerhet</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vi implementerar lämpliga tekniska och organisatoriska säkerhetsåtgärder för att skydda dina personuppgifter 
              mot obehörig åtkomst, förlust eller missbruk. Detta inkluderar kryptering, säker datalagring och regelbundna säkerhetsgranskningar.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Dina rättigheter</h2>
            <p className="text-muted-foreground leading-relaxed">Du har rätt att:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Få tillgång till dina personuppgifter</li>
              <li>Korrigera felaktig information</li>
              <li>Begära radering av dina data</li>
              <li>Begränsa behandlingen av dina uppgifter</li>
              <li>Invända mot behandling</li>
              <li>Dataportabilitet</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Cookies och spårningsteknologi</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vi använder cookies och liknande teknologier för att förbättra din upplevelse, analysera användning och 
              tillhandahålla personliga funktioner. Du kan hantera cookie-inställningar genom din webbläsare.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Tredjepartstjänster</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vår tjänst kan integrera med tredjepartstjänster som Pinterest API för outfit-inspiration. 
              Dessa tjänster har sina egna integritetspolicyer och vi uppmuntrar dig att granska dem.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Ändringar av denna policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vi kan uppdatera denna integritetspolicy från tid till annan. Vi kommer att meddela dig om väsentliga 
              ändringar genom att publicera den nya policyn på denna sida och uppdatera "senast uppdaterad"-datumet.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Kontakta oss</h2>
            <p className="text-muted-foreground leading-relaxed">
              Om du har frågor om denna integritetspolicy eller hur vi hanterar dina personuppgifter, 
              vänligen kontakta oss på: privacy@outfitai.com
            </p>
          </section>

          <div className="bg-muted p-6 rounded-lg mt-8">
            <p className="text-sm text-muted-foreground">
              Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PolicyPage;