// src/components/modals/HelpModalContent.tsx
import React from 'react';

interface HelpModalContentProps {
  activeSection: string;
  openAccordion: string | null;
  toggleAccordion: (section: string) => void;
}

export const HelpModalContent: React.FC<HelpModalContentProps> = ({
  activeSection,
  openAccordion,
  toggleAccordion
}) => {
  switch (activeSection) {
    case 'quick-start':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Quick Start Guide</h3>
          <ol className="list-decimal list-inside space-y-3 text-app-text">
            <li>Import a media file using the "Browse Files" button or drag & drop</li>
            <li>Click on the imported file to load it into the timeline</li>
            <li>Switch between Lyrics and Subtitles mode using the tabs</li>
            <li>Paste your text and click "Auto Generate" to create timed clips</li>
            <li>Adjust timing by dragging clips on the timeline</li>
            <li>Customize appearance in the Style tab</li>
            <li>Export your project when ready</li>
          </ol>
        </div>
      );

    case 'tutorials':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Tutorials</h3>
          <div className="space-y-2">
            <button
              onClick={() => toggleAccordion('sync')}
              className="w-full text-left p-3 bg-app-gray-light rounded-md"
            >
              📹 How to sync lyrics with audio
            </button>
            {openAccordion === 'sync' && (
              <div className="p-3 bg-app-gray-dark rounded-md text-sm">
                Use the "Auto Generate" feature with your pasted text. The app will
                automatically estimate timing based on text length. Fine-tune by
                dragging clip edges on the timeline.
              </div>
            )}
            
            <button
              onClick={() => toggleAccordion('styles')}
              className="w-full text-left p-3 bg-app-gray-light rounded-md"
            >
              🎨 Customizing text styles
            </button>
            {openAccordion === 'styles' && (
              <div className="p-3 bg-app-gray-dark rounded-md text-sm">
                Go to the Style tab to adjust font, color, position, and background.
                Save your favorite styles as templates for reuse.
              </div>
            )}
            
            <button
              onClick={() => toggleAccordion('export')}
              className="w-full text-left p-3 bg-app-gray-light rounded-md"
            >
              💾 Exporting your project
            </button>
            {openAccordion === 'export' && (
              <div className="p-3 bg-app-gray-dark rounded-md text-sm">
                Click the Export button in the top bar to configure export settings.
                Choose format, quality, and output location.
              </div>
            )}
          </div>
        </div>
      );

    case 'faq':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Frequently Asked Questions</h3>
          <div className="space-y-3">
            <div>
              <p className="font-medium">Q: What file formats are supported?</p>
              <p className="text-sm text-app-gray mt-1">A: Audio: MP3, WAV, M4A, OGG. Video: MP4, MOV, WebM.</p>
            </div>
            <div>
              <p className="font-medium">Q: Can I use both lyrics and subtitles?</p>
              <p className="text-sm text-app-gray mt-1">A: Yes! Switch between modes using the tabs. Each has independent timing and styling.</p>
            </div>
            <div>
              <p className="font-medium">Q: How do I save my project?</p>
              <p className="text-sm text-app-gray mt-1">A: Use Ctrl+S or the Save button. Projects are auto-saved locally.</p>
            </div>
          </div>
        </div>
      );

    case 'support':
      return (
        <div className="space-y-4 text-center">
          <h3 className="text-lg font-semibold">Need Help?</h3>
          <p>Contact our support team:</p>
          <p className="text-primary">support@voxmatch.com</p>
          <div className="pt-4">
            <p className="text-sm text-app-gray">Response time: 24-48 hours</p>
          </div>
        </div>
      );

    default:
      return null;
  }
};

