export const generateTenantId = (companyName: string): string => {
  // Limpia el nombre y mantén solo letras y números
  const cleanName = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^a-z0-9]/g, '')       // Solo deja letras y números
    .replace(/\s+/g, '');            // Elimina espacios

  // Genera números aleatorios
  const firstRandom = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  const secondRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  return `${cleanName}-${firstRandom}-${secondRandom}`;
};

//? Alternativa con timestamp
export const generateTenantIdWithTimestamp = (companyName: string): string => {
  const cleanName = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');

  const timestamp = Date.now().toString(36);  // Base 36 para hacerlo más corto
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  return `${cleanName}-${timestamp}-${random}`;
};

//? Formato más corto: chimuagro-12345-6789
export const generateShortTenantId = (companyName: string): string => {
  const cleanName = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');

  //? Toma los primeros 8 caracteres
  const shortName = cleanName.slice(0, 8);
  const firstRandom = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  const secondRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  return `${shortName}-${firstRandom}-${secondRandom}`;
};