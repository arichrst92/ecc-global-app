/** Konten group: file, pengumuman, voting — /admin/group/:id/{files,announcements,polls} */

export type GroupPerson = { id: string; namaLengkap: string } | null;

export type GroupFile = {
  id: string;
  nama: string;
  deskripsi: string | null;
  fileUrl: string;
  fileMime: string;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
  uploadedBy: GroupPerson;
};

export type GroupAnnouncement = {
  id: string;
  judul: string;
  isi: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: GroupPerson;
};

export type GroupPollOption = {
  id: string;
  label: string;
  /** null = hasil disembunyikan (anggota belum memilih & voting masih buka) */
  count: number | null;
  /** hanya untuk PIC/admin */
  voters?: { id: string; namaLengkap: string }[];
};

export type GroupPoll = {
  id: string;
  pertanyaan: string;
  deskripsi: string | null;
  multiple: boolean;
  closesAt: string | null;
  isClosed: boolean;
  isOpen: boolean;
  createdAt: string;
  createdBy: GroupPerson;
  totalVoters: number;
  myVotes: string[];
  showResults: boolean;
  options: GroupPollOption[];
};

export type CreateAnnouncementPayload = { judul: string; isi: string; isPinned?: boolean; notify?: boolean };
export type CreatePollPayload = {
  pertanyaan: string;
  deskripsi?: string | null;
  options: string[];
  multiple?: boolean;
  closesAt?: string | null;
  notify?: boolean;
};
