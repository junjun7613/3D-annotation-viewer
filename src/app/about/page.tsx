'use client';

import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

export default function About() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-white border-b border-[var(--border)] py-4 px-6 flex items-center shadow-sm">
        <Link href="/" className="mr-4 text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">
          <FaArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="m-0 text-xl font-bold text-[var(--text-primary)]">About IIIF 3D Viewer</h1>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Overview</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            IIIF 3D Viewer is a web-based application for viewing and annotating 3D models using the IIIF (International Image Interoperability Framework) standard.
            This tool allows you to load 3D models, create annotations, link textual data, and manage resources in an integrated environment.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Key Features</h2>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">1. 3D Model Viewing</h3>
            <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
              <li>Load 3D models via IIIF Manifest URLs</li>
              <li>Interactive rotation, zoom, and pan controls</li>
              <li>Support for various 3D file formats through IIIF manifests</li>
              <li>Toggle between sprite and polygon annotation modes</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">2. Annotation System</h3>
            <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
              <li><strong>Sprite Annotations:</strong> Click on the 3D model to create point-based annotations</li>
              <li><strong>Polygon Annotations:</strong> Draw custom polygons with arbitrary points by clicking multiple times (double-click or press Enter to finish)</li>
              <li>Edit annotation titles and descriptions using a rich text editor</li>
              <li>Toggle annotation visibility with the eye icon</li>
              <li>Switch between annotation modes using the toggle button</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">3. TEI/XML Text Viewer</h3>
            <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
              <li>Upload TEI/XML files to display textual content alongside 3D models</li>
              <li><strong>Diplomatic View:</strong> Shows abbreviated text in uppercase (e.g., "D M")</li>
              <li><strong>Transcription View:</strong> Shows full expansions with parentheses (e.g., "D(is) M(anibus)")</li>
              <li>Clickable line markers (🔗) for linking text lines to 3D annotations</li>
              <li>Only displays content from edition sections</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">4. Resource Management</h3>
            <p className="text-[var(--text-secondary)] mb-2">Access via the Resources tab:</p>
            <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
              <li>Add images and videos related to annotations</li>
              <li>Upload resource data via CSV files</li>
              <li>View resources in a grid layout</li>
              <li>Click on images to view full-size versions</li>
              <li>Support for YouTube video embeds</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">5. Linked Data</h3>
            <p className="text-[var(--text-secondary)] mb-2">Access via the Linked Data tab:</p>
            <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
              <li>Link annotations to Wikidata entities</li>
              <li>Connect to GeoNames for geographic data</li>
              <li>Upload authority data via CSV files</li>
              <li>View Wikipedia articles and external URIs</li>
              <li>Display geographic locations on maps</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">6. Bibliographic References</h3>
            <p className="text-[var(--text-secondary)] mb-2">Access via the References tab:</p>
            <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
              <li>Add bibliographic citations to annotations</li>
              <li>Include author, year, title, and page information</li>
              <li>Link to web pages and PDF files</li>
              <li>Upload bibliography data via CSV files</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">7. Data Export</h3>
            <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
              <li><strong>RDF Export:</strong> Click the RDF logo to export annotation data as RDF/Turtle format</li>
              <li><strong>IIIF Manifest:</strong> Click the IIIF logo to view the current manifest</li>
              <li><strong>JSON Download:</strong> Download annotation data as JSON files</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">How to Use</h2>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">Getting Started</h3>
            <ol className="list-decimal pl-6 text-[var(--text-secondary)] space-y-3">
              <li><strong>Load a 3D Model:</strong> Enter a IIIF Manifest URL in the input field at the top and press Enter or click outside the field</li>
              <li><strong>Create Annotations:</strong> Click on the 3D model to create annotations (sprite mode) or use the toggle to switch to polygon mode</li>
              <li><strong>Edit Annotation Details:</strong> Click on an annotation marker to view and edit its details in the right panel</li>
              <li><strong>Upload TEI Text:</strong> After loading a 3D model, use the upload button in the Text Viewer to add textual content</li>
            </ol>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">Working with Polygon Annotations</h3>
            <ol className="list-decimal pl-6 text-[var(--text-secondary)] space-y-3">
              <li>Toggle to polygon mode using the switch button in the top-right controls</li>
              <li>Click multiple points on the 3D model to draw a polygon outline</li>
              <li>Visual feedback shows lines connecting your points</li>
              <li>Double-click or press Enter to complete the polygon</li>
              <li>The polygon will have transparency to show underlying surfaces</li>
            </ol>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">Managing Resources and Data</h3>
            <ol className="list-decimal pl-6 text-[var(--text-secondary)] space-y-3">
              <li>Use the tabs (Resources, Linked Data, References) to switch between different data types</li>
              <li>Click the "+" button to add new entries manually</li>
              <li>Click the upload button to import data via CSV files</li>
              <li>Click the delete button (🗑️) to remove entries</li>
            </ol>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">Authentication</h3>
            <p className="text-[var(--text-secondary)]">
              Sign in with your Google account to save and manage annotations. All data is stored in Firebase and associated with your account.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Tips and Best Practices</h2>
          <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
            <li>Use descriptive titles for annotations to make them easy to identify</li>
            <li>Link TEI text lines to annotations for better documentation</li>
            <li>Add Wikidata links to provide context and additional information</li>
            <li>Include bibliographic references to cite sources</li>
            <li>Export your data regularly using the RDF or JSON download features</li>
            <li>Use polygon annotations for complex areas that require precise boundaries</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Technical Information</h2>
          <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2">
            <li><strong>Framework:</strong> Built with Next.js and React</li>
            <li><strong>3D Rendering:</strong> Three.js for WebGL-based 3D visualization</li>
            <li><strong>TEI Processing:</strong> CETEIcean for TEI/XML rendering</li>
            <li><strong>Database:</strong> Firebase Firestore for data storage</li>
            <li><strong>Standards:</strong> Compliant with IIIF Presentation API 3.0</li>
          </ul>
        </section>

        <section className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-xl font-bold mb-3 text-blue-900">Need Help?</h2>
          <p className="text-blue-800">
            For questions, bug reports, or feature requests, please contact the development team or consult the project documentation.
          </p>
        </section>
      </main>
    </div>
  );
}
