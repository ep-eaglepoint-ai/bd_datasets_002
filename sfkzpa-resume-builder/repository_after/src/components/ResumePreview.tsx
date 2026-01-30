import React from 'react';
import type { ResumeData } from '../types';
import { Mail, Phone, MapPin, Linkedin, Globe, Link as LinkIcon } from 'lucide-react';

export const ResumePreview: React.FC<{ resume: ResumeData }> = ({ resume }) => {
    const renderSection = (type: string) => {
        switch (type) {
            case 'personal':
                return (
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                            {resume.personalInfo.fullName || 'Your Name'}
                        </h1>
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-600">
                            {resume.personalInfo.email && (
                                <div className="flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>{resume.personalInfo.email}</span>
                                </div>
                            )}
                            {resume.personalInfo.phone && (
                                <div className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>{resume.personalInfo.phone}</span>
                                </div>
                            )}
                            {resume.personalInfo.address && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>{resume.personalInfo.address}</span>
                                </div>
                            )}
                            {resume.personalInfo.linkedin && (
                                <div className="flex items-center gap-1">
                                    <Linkedin className="w-3.5 h-3.5" />
                                    <a href={resume.personalInfo.linkedin} target="_blank" rel="noopener noreferrer" className="hover:underline">LinkedIn</a>
                                </div>
                            )}
                            {resume.personalInfo.website && (
                                <div className="flex items-center gap-1">
                                    <Globe className="w-3.5 h-3.5" />
                                    <a href={resume.personalInfo.website} target="_blank" rel="noopener noreferrer" className="hover:underline">Portfolio</a>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'summary':
                if (!resume.summary) return null;
                return (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-3 uppercase tracking-wider">Professional Summary</h2>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{resume.summary}</p>
                    </div>
                );

            case 'experience':
                if (resume.experience.length === 0) return null;
                return (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-4 uppercase tracking-wider">Work Experience</h2>
                        <div className="space-y-4">
                            {resume.experience.map(exp => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-gray-900">{exp.position}</h3>
                                        <span className="text-sm text-gray-600 shrink-0">
                                            {exp.startDate} – {exp.endDate || (exp.current ? 'Present' : '')}
                                        </span>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-700 mb-1">{exp.company}</div>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'education':
                if (resume.education.length === 0) return null;
                return (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-4 uppercase tracking-wider">Education</h2>
                        <div className="space-y-4">
                            {resume.education.map(edu => (
                                <div key={edu.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-gray-900">{edu.institution}</h3>
                                        <span className="text-sm text-gray-600 shrink-0">{edu.graduationDate}</span>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                        <span className="font-semibold">{edu.degree}</span>
                                        {edu.field && <span>, {edu.field}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'projects':
                if (resume.projects.length === 0) return null;
                return (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-4 uppercase tracking-wider">Projects</h2>
                        <div className="space-y-4">
                            {resume.projects.map(proj => (
                                <div key={proj.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            {proj.name}
                                            {proj.link && (
                                                <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600">
                                                    <LinkIcon className="w-3 h-3" />
                                                </a>
                                            )}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{proj.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'skills':
                if (!resume.skills) return null;
                return (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-3 uppercase tracking-wider">Skills</h2>
                        <div className="text-sm text-gray-700 leading-relaxed">
                            {resume.skills}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="h-full w-full bg-white font-sans text-gray-800">
            {resume.sections.filter(s => s.isVisible).map(s => (
                <div key={s.id}>
                    {renderSection(s.type)}
                </div>
            ))}
        </div>
    );
};
