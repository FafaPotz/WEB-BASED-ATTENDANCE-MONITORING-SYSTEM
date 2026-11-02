export interface Organization {
  value: string;
  label: string;
  code: string;
}

// Student academic departments / student organizations
// Excludes CSG (College Student Government) and CS (College of Sciences)
export const STUDENT_ORGANIZATIONS: Organization[] = [
  {
    value: 'Association of Computer Scientists',
    label: 'Association of Computer Scientists',
    code: 'ACS'
  },
  {
    value: 'Environmental Science Student Association',
    label: 'Environmental Science Student Association',
    code: 'ESSA'
  },
  {
    value: 'Marine Biologist Society',
    label: 'Marine Biologist Society',
    code: 'MBS'
  },
  {
    value: 'Society of Information Technology Enthusiasts',
    label: 'Society of Information Technology Enthusiasts',
    code: 'SITE'
  },
  {
    value: 'Young Biologist Association',
    label: 'Young Biologist Association',
    code: 'YBA'
  }
];

// Officer department is fixed strictly to 1: CSG
export const OFFICER_ORGANIZATION: Organization = {
  value: 'College of Sciences · College Student Government',
  label: 'College of Sciences · College Student Government',
  code: 'CSG'
};

// All organizations combined for system reference
export const ORGANIZATIONS: Organization[] = [
  OFFICER_ORGANIZATION,
  ...STUDENT_ORGANIZATIONS
];

export const getOrganizationCode = (organizationName: string): string => {
  const org = ORGANIZATIONS.find(o => o.value === organizationName);
  return org ? org.code : '';
};

export const getNextStudentCode = (organizationName: string, existingCodes: string[] = []): string => {
  const code = getOrganizationCode(organizationName) || 'STUD';
  const orgCodes = existingCodes.filter(c => c.startsWith(code));
  const numbers = orgCodes.map(c => {
    const num = c.replace(code, '');
    return parseInt(num) || 0;
  });
  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${code}${String(nextNum).padStart(2, '0')}`;
};
