/**
 * Curated verse-of-day pool. Di-rotate berdasarkan day-of-year supaya
 * konsisten per hari + deterministik tanpa BE.
 */
import type { VerseOfDay } from '@/types/bible';

const POOL: VerseOfDay[] = [
  { ref: 'YOH 3', bookId: 43, bab: 3, ayat: 16, teks: 'Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal, supaya setiap orang yang percaya kepada-Nya tidak binasa, melainkan beroleh hidup yang kekal.' },
  { ref: 'MZM 23', bookId: 19, bab: 23, ayat: 1, teks: 'TUHAN adalah gembalaku, takkan kekurangan aku.' },
  { ref: 'AMS 3', bookId: 20, bab: 3, ayat: 5, teks: 'Percayalah kepada TUHAN dengan segenap hatimu, dan janganlah bersandar kepada pengertianmu sendiri.' },
  { ref: 'AMS 3', bookId: 20, bab: 3, ayat: 6, teks: 'Akuilah Dia dalam segala lakumu, maka Ia akan meluruskan jalanmu.' },
  { ref: 'FLP 4', bookId: 50, bab: 4, ayat: 13, teks: 'Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku.' },
  { ref: 'FLP 4', bookId: 50, bab: 4, ayat: 6, teks: 'Janganlah hendaknya kamu kuatir tentang apa pun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur.' },
  { ref: 'YES 40', bookId: 23, bab: 40, ayat: 31, teks: 'tetapi orang-orang yang menanti-nantikan TUHAN mendapat kekuatan baru: mereka seumpama rajawali yang naik terbang dengan kekuatan sayapnya.' },
  { ref: 'RM 8', bookId: 45, bab: 8, ayat: 28, teks: 'Kita tahu sekarang, bahwa Allah turut bekerja dalam segala sesuatu untuk mendatangkan kebaikan bagi mereka yang mengasihi Dia.' },
  { ref: 'RM 8', bookId: 45, bab: 8, ayat: 37, teks: 'Tetapi dalam semuanya itu kita lebih dari pada orang-orang yang menang, oleh Dia yang telah mengasihi kita.' },
  { ref: 'MZM 121', bookId: 19, bab: 121, ayat: 1, teks: 'Aku melayangkan mataku ke gunung-gunung; dari manakah akan datang pertolonganku?' },
  { ref: 'MZM 121', bookId: 19, bab: 121, ayat: 2, teks: 'Pertolonganku ialah dari TUHAN, yang menjadikan langit dan bumi.' },
  { ref: 'MAT 6', bookId: 40, bab: 6, ayat: 33, teks: 'Tetapi carilah dahulu Kerajaan Allah dan kebenarannya, maka semuanya itu akan ditambahkan kepadamu.' },
  { ref: 'MAT 6', bookId: 40, bab: 6, ayat: 34, teks: 'Sebab itu janganlah kamu kuatir akan hari besok, karena hari besok mempunyai kesusahannya sendiri.' },
  { ref: '1KOR 13', bookId: 46, bab: 13, ayat: 4, teks: 'Kasih itu sabar; kasih itu murah hati; ia tidak cemburu. Ia tidak memegahkan diri dan tidak sombong.' },
  { ref: '1KOR 13', bookId: 46, bab: 13, ayat: 13, teks: 'Demikianlah tinggal ketiga hal ini, yaitu iman, pengharapan dan kasih, dan yang paling besar di antaranya ialah kasih.' },
  { ref: 'YOH 14', bookId: 43, bab: 14, ayat: 6, teks: 'Akulah jalan dan kebenaran dan hidup. Tidak ada seorang pun yang datang kepada Bapa, kalau tidak melalui Aku.' },
  { ref: 'YOH 14', bookId: 43, bab: 14, ayat: 27, teks: 'Damai sejahtera Kutinggalkan bagimu. Damai sejahtera-Ku Kuberikan kepadamu, dan apa yang Kuberikan tidak seperti yang diberikan oleh dunia kepadamu.' },
  { ref: 'MZM 91', bookId: 19, bab: 91, ayat: 11, teks: 'sebab malaikat-malaikat-Nya akan diperintahkan-Nya kepadamu untuk menjaga engkau di segala jalanmu.' },
  { ref: 'IBR 11', bookId: 58, bab: 11, ayat: 1, teks: 'Iman adalah dasar dari segala sesuatu yang kita harapkan dan bukti dari segala sesuatu yang tidak kita lihat.' },
  { ref: 'RM 12', bookId: 45, bab: 12, ayat: 2, teks: 'Janganlah kamu menjadi serupa dengan dunia ini, tetapi berubahlah oleh pembaharuan budimu, sehingga kamu dapat membedakan manakah kehendak Allah.' },
  { ref: 'RM 12', bookId: 45, bab: 12, ayat: 12, teks: 'Bersukacitalah dalam pengharapan, sabarlah dalam kesesakan, dan bertekunlah dalam doa!' },
];

/** Day-of-year (1-366) -> deterministic pick dari pool */
export function getVerseOfDay(date: Date = new Date()): VerseOfDay {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return POOL[dayOfYear % POOL.length];
}

export const VERSE_OF_DAY_POOL = POOL;
