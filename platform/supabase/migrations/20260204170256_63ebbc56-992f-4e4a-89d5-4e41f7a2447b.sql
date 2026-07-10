-- Políticas de RLS para o bucket pdf-uploads

-- Política para usuários visualizarem seus arquivos
CREATE POLICY "Users can view own files in pdf-uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pdf-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para usuários fazerem upload em sua própria pasta
CREATE POLICY "Users can upload files to pdf-uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdf-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para usuários excluírem seus próprios arquivos
CREATE POLICY "Users can delete own files in pdf-uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pdf-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);