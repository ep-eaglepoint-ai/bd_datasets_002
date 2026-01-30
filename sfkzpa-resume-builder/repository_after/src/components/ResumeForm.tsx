import React from 'react';
import type { ResumeData, ExperienceItem, EducationItem, ProjectItem, CustomSectionItem } from '../types';
import { SectionWrapper } from './ui/SectionWrapper';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { Plus, Trash2 } from 'lucide-react';

interface ResumeFormProps {
    resume: ResumeData;
    setResume: (data: ResumeData) => void;
}

export const ResumeForm: React.FC<ResumeFormProps> = ({ resume, setResume }) => {
    const updateSectionOrder = (index: number, direction: 'up' | 'down') => {
        const newSections = [...resume.sections];
        if (direction === 'up' && index > 0) {
            [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
        } else if (direction === 'down' && index < newSections.length - 1) {
            [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
        }
        setResume({ ...resume, sections: newSections });
    };

    const toggleSection = (id: string) => {
        const newSections = resume.sections.map(s =>
            s.id === id ? { ...s, isVisible: !s.isVisible } : s
        );
        setResume({ ...resume, sections: newSections });
    };

    const addCustomSection = () => {
        const id = crypto.randomUUID();
        const newSection = { id, title: 'Custom Section', isVisible: true, type: 'custom' as const };
        const newCustomItem = { id, title: 'Custom Section', content: '' };

        setResume({
            ...resume,
            sections: [...resume.sections, newSection],
            customSections: [...(resume.customSections || []), newCustomItem]
        });
    };

    const removeCustomSection = (id: string) => {
        setResume({
            ...resume,
            sections: resume.sections.filter(s => s.id !== id),
            customSections: (resume.customSections || []).filter(s => s.id !== id)
        });
    };

    const updateCustomSection = (id: string, field: 'title' | 'content', value: string) => {
        const updatedCustomSections = (resume.customSections || []).map(s =>
            s.id === id ? { ...s, [field]: value } : s
        );

        let updatedSections = resume.sections;
        if (field === 'title') {
            updatedSections = resume.sections.map(s =>
                s.id === id ? { ...s, title: value } : s
            );
        }

        setResume({
            ...resume,
            customSections: updatedCustomSections,
            sections: updatedSections
        });
    };

    const updatePersonalInfo = (field: keyof ResumeData['personalInfo'], value: string) => {
        setResume({
            ...resume,
            personalInfo: { ...resume.personalInfo, [field]: value }
        });
    };


    const addItem = <T extends { id: string }>(section: 'experience' | 'education' | 'projects', item: T) => {
        setResume({
            ...resume,
            [section]: [...resume[section], item]
        });
    };

    const removeItem = (section: 'experience' | 'education' | 'projects', id: string) => {
        setResume({
            ...resume,
            [section]: (resume[section] as any[]).filter((item: any) => item.id !== id)
        });
    };

    const updateItem = (section: 'experience' | 'education' | 'projects', id: string, field: string, value: any) => {
        setResume({
            ...resume,
            [section]: (resume[section] as any[]).map((item: any) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        });
    };

    const renderSectionContent = (type: string, sectionId: string) => {
        switch (type) {
            case 'personal':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Full Name"
                            value={resume.personalInfo.fullName}
                            onChange={e => updatePersonalInfo('fullName', e.target.value)}
                            placeholder="John Doe"
                            required
                            error={!resume.personalInfo.fullName ? "Full name is required" : undefined}
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={resume.personalInfo.email}
                            onChange={e => updatePersonalInfo('email', e.target.value)}
                            placeholder="john@example.com"
                            required
                            error={!resume.personalInfo.email ? "Email is required" : undefined}
                        />
                        <Input label="Phone" type="tel" value={resume.personalInfo.phone} onChange={e => updatePersonalInfo('phone', e.target.value)} placeholder="(555) 123-4567" />
                        <Input label="Address" value={resume.personalInfo.address} onChange={e => updatePersonalInfo('address', e.target.value)} placeholder="New York, NY" />
                        <Input label="LinkedIn" value={resume.personalInfo.linkedin} onChange={e => updatePersonalInfo('linkedin', e.target.value)} placeholder="linkedin.com/in/johndoe" />
                        <Input label="Website" value={resume.personalInfo.website} onChange={e => updatePersonalInfo('website', e.target.value)} placeholder="johndoe.com" />
                    </div>
                );
            case 'custom': {
                const customSection = (resume.customSections || []).find(s => s.id === sectionId);
                if (!customSection) return null;
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <Input
                                label="Section Title"
                                value={customSection.title}
                                onChange={e => updateCustomSection(sectionId, 'title', e.target.value)}
                            />
                            <TextArea
                                label="Content"
                                value={customSection.content}
                                onChange={e => updateCustomSection(sectionId, 'content', e.target.value)}
                                placeholder="Enter content..."
                            />
                        </div>
                        <button
                            onClick={() => removeCustomSection(sectionId)}
                            className="text-red-500 text-sm hover:underline flex items-center gap-1"
                        >
                            <Trash2 className="w-3 h-3" /> Remove Section
                        </button>
                    </div>
                );
            }
            case 'summary':
                return (
                    <TextArea
                        label="Professional Summary"
                        value={resume.summary}
                        onChange={e => setResume({ ...resume, summary: e.target.value })}
                        placeholder="Briefly describe your professional background and goals..."
                    />
                );
            case 'skills':
                return (
                    <TextArea
                        label="Skills (Comma separated)"
                        value={resume.skills}
                        onChange={e => setResume({ ...resume, skills: e.target.value })}
                        placeholder="React, TypeScript, Node.js, Project Management..."
                    />
                );
            case 'experience':
                return (
                    <div className="space-y-6">
                        {resume.experience.map(exp => (
                            <div key={exp.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 relative group">
                                <button
                                    onClick={() => removeItem('experience', exp.id)}
                                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Remove Item"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <Input label="Company" value={exp.company} onChange={e => updateItem('experience', exp.id, 'company', e.target.value)} />
                                    <Input label="Position" value={exp.position} onChange={e => updateItem('experience', exp.id, 'position', e.target.value)} />
                                    <Input label="Start Date" value={exp.startDate} onChange={e => updateItem('experience', exp.id, 'startDate', e.target.value)} placeholder="Jan 2020" />
                                    <Input label="End Date" value={exp.endDate} onChange={e => updateItem('experience', exp.id, 'endDate', e.target.value)} placeholder="Present" />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                    <input type="checkbox" checked={exp.current} onChange={e => updateItem('experience', exp.id, 'current', e.target.checked)} className="rounded text-blue-600" />
                                    I currently work here
                                </label>
                                <TextArea label="Description" value={exp.description} onChange={e => updateItem('experience', exp.id, 'description', e.target.value)} />
                            </div>
                        ))}
                        <button
                            onClick={() => addItem<ExperienceItem>('experience', { id: crypto.randomUUID(), company: '', position: '', startDate: '', endDate: '', current: false, description: '' })}
                            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
                        >
                            <Plus className="w-4 h-4" /> Add Experience
                        </button>
                    </div>
                );
            case 'education':
                return (
                    <div className="space-y-6">
                        {resume.education.map(edu => (
                            <div key={edu.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 relative group">
                                <button
                                    onClick={() => removeItem('education', edu.id)}
                                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Institution" value={edu.institution} onChange={e => updateItem('education', edu.id, 'institution', e.target.value)} />
                                    <Input label="Degree" value={edu.degree} onChange={e => updateItem('education', edu.id, 'degree', e.target.value)} />
                                    <Input label="Field of Study" value={edu.field} onChange={e => updateItem('education', edu.id, 'field', e.target.value)} />
                                    <Input label="Graduation Date" value={edu.graduationDate} onChange={e => updateItem('education', edu.id, 'graduationDate', e.target.value)} />
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => addItem<EducationItem>('education', { id: crypto.randomUUID(), institution: '', degree: '', field: '', graduationDate: '' })}
                            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
                        >
                            <Plus className="w-4 h-4" /> Add Education
                        </button>
                    </div>
                );
            case 'projects':
                return (
                    <div className="space-y-6">
                        {resume.projects.map(proj => (
                            <div key={proj.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 relative group">
                                <button
                                    onClick={() => removeItem('projects', proj.id)}
                                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <Input label="Project Name" value={proj.name} onChange={e => updateItem('projects', proj.id, 'name', e.target.value)} />
                                    <Input label="Link" value={proj.link} onChange={e => updateItem('projects', proj.id, 'link', e.target.value)} />
                                </div>
                                <TextArea label="Description" value={proj.description} onChange={e => updateItem('projects', proj.id, 'description', e.target.value)} />
                            </div>
                        ))}
                        <button
                            onClick={() => addItem<ProjectItem>('projects', { id: crypto.randomUUID(), name: '', description: '', link: '' })}
                            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
                        >
                            <Plus className="w-4 h-4" /> Add Project
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {resume.sections.map((section, index) => (
                    <SectionWrapper
                        key={section.id}
                        title={section.title}
                        isVisible={section.isVisible}
                        onToggle={() => toggleSection(section.id)}
                        onMoveUp={() => updateSectionOrder(index, 'up')}
                        onMoveDown={() => updateSectionOrder(index, 'down')}
                    >
                        {renderSectionContent(section.type, section.id)}
                    </SectionWrapper>
                ))}
            </div>

            <button
                onClick={addCustomSection}
                className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
            >
                <Plus className="w-4 h-4" /> Add Custom Section
            </button>
        </div>
    );
};
