import { PenSquare, User, BarChart2 } from 'lucide-react';
import StoryForm from '@/components/StoryForm';

export default function StudentVoicePage() {
  return (
    <div className="container mx-auto px-6 py-12 md:py-20">
      <header className="text-center mb-16">
        <PenSquare className="mx-auto text-primary h-16 w-16 mb-4" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary">Student Voice</h1>
        <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
          Your platform to be heard. Share your story, spotlight a peer, or participate in campus polls.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Submit Your Story Section */}
        <section className="lg:col-span-2">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold text-text-primary mb-6">Submit Your Story</h2>
            <p className="text-text-secondary mb-8">
              Have an article, a poem, or a personal story you want to share? We want to read it! Fill out the form below and our editorial team will get in touch.
            </p>
            <StoryForm />
          </div>
        </section>

       {/* Polls & Survey Section */}
<section className="bg-white p-8 rounded-xl shadow-lg">
  <h3 className="text-2xl font-bold text-text-primary mb-4 flex items-center justify-center gap-2">
    <BarChart2 className="text-secondary" /> Weekly Poll
  </h3>
  <p className="text-text-secondary mb-4">What's the best study spot on campus?</p>

  {/* Embedded Google Form */}
  <div className="w-full h-[600px]">
    <iframe
      src="https://docs.google.com/forms/d/e/1FAIpQLSeoC_M_09Vln_85dGAgKbTEfXWBTZX0mwBrMQ3fXj-SKgLEqg/viewform?embedded=true"
      width="100%"
      height="100%"
      frameBorder="0"
      marginHeight="0"
      marginWidth="0"
      className="rounded-xl"
    >
      Loading…
    </iframe>
  </div>

  <p className="text-xs text-center mt-4 text-gray-500">
    This is a live poll. Submit your vote below.
  </p>
</section>
      </div>
    </div>
  );
}

