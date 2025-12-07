import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, BookText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <BookText className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">PPSU Chronicles</span>
            </Link>
            <p className="text-gray-400 text-sm">
              The official student voice of P. P. Savani University. Capturing the moments that matter.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/stories" className="text-gray-400 hover:text-white transition">Stories</Link></li>
              <li><Link href="/events" className="text-gray-400 hover:text-white transition">Events</Link></li>
              <li><Link href="/student-voice" className="text-gray-400 hover:text-white transition">Submit a Story</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition">Contact Us</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-bold text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href="/privacy-policy" className="text-gray-400 hover:text-white transition">Privacy Policy</a></li>
              <li><a href="/terms-of-service" className="text-gray-400 hover:text-white transition">Terms of Service</a></li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-bold text-lg mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/profile.php?id=61577874447651" className="text-gray-400 hover:text-white transition"><Facebook size={24} /></a>
              <a href="https://x.com/PPSUChronicles" className="text-gray-400 hover:text-white transition"><Twitter size={24} /></a>
              <a href="https://www.instagram.com/theppsuchronicles/" className="text-gray-400 hover:text-white transition"><Instagram size={24} /></a>
              <a href="https://www.linkedin.com/in/the-ppsu-chronicles-213912371/" className="text-gray-400 hover:text-white transition"><Linkedin size={24} /></a>
            </div>
          </div>
        </div>

        {/* New university info line */}
        <div className="mt-12 text-center text-gray-400 text-sm">
          <p>
            For more information about our University, you can kindly visit:{' '}
            <a
              href="https://www.ppsu.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              https://www.ppsu.ac.in/
            </a>
          </p>
        </div>

        {/* Footer bottom */}
        <div className="mt-4 border-t border-gray-700 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} The PPSU Chronicles. All Rights Reserved.</p>
          <p className="mt-1">A Student-Led Initiative at P. P. Savani University.</p>
        </div>
      </div>
    </footer>
  );
}

