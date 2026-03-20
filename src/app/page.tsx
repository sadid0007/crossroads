"use client";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";

const features = [
  {
    title: "Listening",
    description: "Practice with authentic audio recordings, part-by-part navigation, and real-time question answering.",
    icon: "🎧",
    color: "bg-purple-50 border-purple-200",
  },
  {
    title: "Reading",
    description: "Split-screen passages with all question types. Free navigation across three passages.",
    icon: "📖",
    color: "bg-blue-50 border-blue-200",
  },
  {
    title: "Writing",
    description: "Task 1 and Task 2 with word count, autosave, and professional evaluator feedback.",
    icon: "✍️",
    color: "bg-green-50 border-green-200",
  },
  {
    title: "Speaking",
    description: "Self-recorded responses with precise per-part timing matching the real IELTS test.",
    icon: "🎤",
    color: "bg-orange-50 border-orange-200",
  },
];

const highlights = [
  "Realistic exam simulation with strict timing",
  "Instant auto-scoring for Listening & Reading",
  "Professional evaluation for Writing & Speaking",
  "Detailed diagnostic feedback by question type",
  "Performance tracking and trend analysis",
  "Review mode with explanations and audio replay",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Your IELTS Band Score<br />
              <span className="text-blue-200">Starts Here</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-blue-100 max-w-3xl mx-auto">
              Experience the most realistic IELTS mock test online. Practice all four modules with
              authentic exam conditions, get instant scores, and receive detailed feedback to improve.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8">
                  Start Free Mock Test
                </Button>
              </Link>
              <Link href="/tests">
                <Button size="lg" variant="outline" className="border-blue-300 text-white hover:bg-blue-600/50">
                  Browse Test Catalog
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-blue-200">No payment required. Sign up and start practicing in 2 minutes.</p>
          </div>
        </div>
      </section>

      {/* Four Modules */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">All Four IELTS Modules</h2>
          <p className="mt-3 text-gray-600">Practice each skill with exam-accurate navigation, timing, and constraints.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className={`rounded-xl border p-6 ${f.color} transition-transform hover:scale-105`}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Choose Crossroads?</h2>
              <ul className="space-y-4">
                {highlights.map((h) => (
                  <li key={h} className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-10 lg:mt-0">
              <div className="bg-gray-50 rounded-2xl p-8 border">
                <div className="text-center">
                  <div className="text-5xl font-bold text-blue-600 mb-2">7.5+</div>
                  <p className="text-gray-600 mb-6">Average band improvement after 3 mock tests</p>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="text-2xl font-bold text-gray-900">4</div>
                      <p className="text-xs text-gray-500">Modules</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="text-2xl font-bold text-gray-900">40+</div>
                      <p className="text-xs text-gray-500">Question Types</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="text-2xl font-bold text-gray-900">Instant</div>
                      <p className="text-xs text-gray-500">Scoring</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="text-2xl font-bold text-gray-900">24/7</div>
                      <p className="text-xs text-gray-500">Access</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Ace Your IELTS?</h2>
          <p className="text-blue-100 mb-8">Join thousands of students preparing smarter with Crossroads.</p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-10">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CR</span>
              </div>
              <span className="text-white font-semibold">Crossroads IELTS Simulator</span>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} Crossroads Initiative. Not affiliated with IELTS or British Council.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
