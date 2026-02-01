export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  graduationDate: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  link: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  description: string;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  content: string;
}

export interface SectionConfig {
  id: string;
  title: string;
  isVisible: boolean;
  type: "personal" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "custom";
}

export interface ResumeData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    linkedin: string;
  };
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string;
  projects: ProjectItem[];
  certifications: CertificationItem[];
  customSections: CustomSectionItem[];
  sections: SectionConfig[];
}
