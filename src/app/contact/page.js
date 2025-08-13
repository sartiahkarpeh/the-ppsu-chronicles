import { Mail } from 'lucide-react';
import ContactForm from '@/components/ContactForm';

export default function ContactPage() {
  return (
    <div className="bg-white">
      <div className="container mx-auto px-6 py-12 md:py-20">
        <header className="text-center mb-12">
          <Mail className="mx-auto text-primary h-16 w-16 mb-4" />
          <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary">Contact Us</h1>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            Have a question, suggestion, or a news tip? We&apos;d love to hear from you.
          </p>
        </header>

        <div className="max-w-2xl mx-auto bg-card-bg p-8 rounded-xl shadow-lg">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}

