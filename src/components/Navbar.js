'use client';
import Link from 'next/link';
import { useState } from 'react';
import { BookText, Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/stories', label: 'Stories' },
  { href: '/media', label: 'Media' },
  { href: '/events', label: 'Events' },
  { href: '/student-voice', label: 'Student Voice' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <BookText className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-text-primary">PPSU Chronicles</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className="text-text-primary hover:text-primary transition-colors font-medium">
                {link.label}
              </Link>
            ))}
            <Link href="#" className="bg-primary text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors text-sm font-semibold">
                Login
            </Link>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden px-6 pt-2 pb-4 space-y-2 bg-white border-t">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="block text-text-primary hover:text-primary transition-colors py-2 font-medium">
              {link.label}
            </Link>
          ))}
          <Link href="#" className="block w-full text-center bg-primary text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors mt-2 font-semibold">
              Login
          </Link>
        </div>
      )}
    </nav>
  );
}


