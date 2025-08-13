import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { clubs } from '@/data/clubs';
import { Users, Mail, ArrowLeft } from 'lucide-react';

// Pre-render slugs
export async function generateStaticParams() {
  return clubs.map(club => ({
    slug: club.slug,
  }));
}

export default async function ClubDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = clubs.find(c => c.slug === slug);

  if (!club) notFound();

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">


          {/* Header */}
          <div className="bg-primary/10 p-8 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">{club.name}</h1>
            <Image
              src={club.logo}
              alt={`${club.name} Logo`}
              width={700}
              height={500}
              className="rounded-xl object-cover border-4 border-white shadow-lg mx-auto"
            />
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">

            {/* Description */}
            <h2 className="text-2xl font-bold text-text-primary mb-4">About the Club</h2>
            <p className="text-text-secondary text-lg leading-relaxed mb-8 whitespace-pre-wrap">{club.about}</p>

            {/* Club-specific Sections */}
            {slug === 'african-students-at-ppsu' && (
              <>

                {/* Leaders */}
                <h3 className="text-xl font-bold text-primary mb-6 text-center">Meet Our Leaders</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 text-center">
                  {/* Leader 1 */}
                  <div>
                    <Image src="/musa.jpg" alt="Musa James" width={100} height={100} className="rounded-full mx-auto" />
                    <p className="mt-2 font-semibold">Musa James</p>
                    <p className="text-sm text-gray-500">President</p>
                  </div>

                  {/* Leader 2 */}
                  <div>
                    <Image src="/jonathan.jpg" alt="Jonathan Chaufa" width={100} height={100} className="rounded-full mx-auto" />
                    <p className="mt-2 font-semibold">Jonathan Chaufa</p>
                    <p className="text-sm text-gray-500">Vice President</p>
                  </div>

                  {/* Leader 3 */}
                  <div>
                    <Image src="/stanley.jpg" alt="Stanley S. Garyeazohn" width={100} height={100} className="rounded-full mx-auto" />
                    <p className="mt-2 font-semibold">Stanley S. Garyeazohn</p>
                    <p className="text-sm text-gray-500">General Secretary</p>
                  </div>

                  {/* Leader 4 */}
                  <div>
                    <Image src="/elmer.jpg" alt="Elmer W.Saye" width={100} height={100} className="rounded-full mx-auto" />
                    <p className="mt-2 font-semibold">Elmer W. Saye</p>
                    <p className="text-sm text-gray-500">Assistant Secretary</p>
                  </div>

                  {/* Leader 5 */}
                  <div>
                    <Image src="/hr.jpg" alt="Umar Hashim" width={100} height={100} className="rounded-full mx-auto" />
                    <p className="mt-2 font-semibold">Umar Hashim</p>
                    <p className="text-sm text-gray-500">Financial Secretary</p>
                  </div>

                  {/* Leader 6 */}
                  <div>
                    <Image src="/magnus.jpg" alt="Magus Joy Dahn" width={100} height={100} className="rounded-full mx-auto" />
                    <p className="mt-2 font-semibold">Magnus Joy Dahn</p>
                    <p className="text-sm text-gray-500">Treasurer</p>
                  </div>
                </div>


                {/* Gallery */}
                <h3 className="text-xl font-bold text-primary mb-4">Our Moments</h3>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <Image src="/culture1.jpg" alt="African Event" width={300} height={200} className="rounded-lg object-cover" />
                  <Image src="/culture4.jpg" alt="African Day" width={300} height={200} className="rounded-lg object-cover" />
                  <Image src="/culture5.jpg" alt="African Day" width={300} height={200} className="rounded-lg object-cover" />
                  <Image src="/culture3.jpg" alt="African Day" width={300} height={200} className="rounded-lg object-cover" />
                </div>

                {/* Social Media */}
                <h3 className="text-xl font-bold text-primary mb-2">Follow Us</h3>
                <ul className="list-disc list-inside text-primary mb-8">
                  <li><a href="https://instagram.com/africanstudentsppsu" className="hover:underline" target="_blank">Instagram</a></li>
                  <li><a href="https://www.facebook.com/share/19DcJCZ37t/?mibextid=wwXIfr" className="hover:underline" target="_blank">Facebook</a></li>
                </ul>
              </>
            )}

            {slug === 'tech-spark' && (
              <>
                <h3 className="text-xl font-bold text-primary mb-2">Latest Projects</h3>
                <ul className="list-disc list-inside text-text-secondary mb-6">
                  <li>Smart Attendance System with QR</li>
                  <li>Real-time Chat App with Next.js</li>
                </ul>
                <h3 className="text-xl font-bold text-primary mb-2">Follow Us</h3>
                <ul className="list-disc list-inside text-primary mb-8">
                  <li><a href="https://github.com/techsparkppsu" className="hover:underline" target="_blank">GitHub</a></li>
                </ul>
              </>
            )}

            {slug === 'drama-club' && (
              <>
                <h3 className="text-xl font-bold text-primary mb-2">Spotlight</h3>
                <p className="text-text-secondary mb-6">Our play &quot;Spectrum of Emotions&quot; was the most celebrated act in 2024 Spectrum Night.</p>
              </>
            )}

            {/* Shared: How to Join / Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 p-6 rounded-lg">
              <div className="flex items-start">
                <Users className="w-8 h-8 text-primary mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg text-text-primary">How to Join</h3>
                  <p className="text-text-secondary">
                    Look for our booth at the annual club fair or contact us via email. We welcome all students!
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="w-8 h-8 text-primary mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg text-text-primary">Contact Us</h3>
                  <p className="text-text-secondary">
                    <a href={`mailto:${club.slug}@ppsu.ac.in`} className="text-primary hover:underline">
                      {club.slug}@ppsu.ac.in
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <div className="text-center mt-12">
              <Link href="/events" className="group text-primary hover:text-blue-600 font-bold text-lg inline-flex items-center">
                <ArrowLeft className="mr-2 transition-transform group-hover:-translate-x-1" /> Back to Campus Life
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

