import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { useToast } from '@/components/ui/use-toast';

interface UploadParams {
  file: File;
  goals?: {
    horse_type: string;
    desired_sire: string;
    analysis_requested: string;
  };
  objective?: string;
  budget?: string;
  horseType?: string;
  saleContext?: string;
  mode?: "pdf_only" | "pdf_biomech" | "pdf_breeze";
  visionImages?: string[]; // JPEG data URLs (base64)
  breezeData?: {
    furlong_time?: string;
    distance?: string;
    going?: string;
    track?: string;
  };
}

export const usePDFUpload = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadPDF = useMutation({
    mutationFn: async ({ file, goals, objective, budget, horseType, saleContext, mode, visionImages, breezeData }: UploadParams) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      if (goals) {
        formData.append('goals', JSON.stringify(goals));
      }
      if (objective) {
        formData.append('objective', objective);
      }
      if (budget) {
        formData.append('budget', budget);
      }
      if (horseType) {
        formData.append('horseType', horseType);
      }
      if (saleContext) {
        formData.append('saleContext', saleContext);
      }
      if (mode) {
        formData.append('mode', mode);
      }
      if (visionImages && visionImages.length > 0) {
        formData.append('visionImages', JSON.stringify(visionImages));
      }
      if (breezeData) {
        formData.append('breezeData', JSON.stringify(breezeData));
      }

      const { data, error } = await supabase.functions.invoke('upload-pdf', {
        body: formData,
      });

      if (error) {
        // The edge function returns JSON with {error, code, hint, diagnostics} —
        // surface those rather than the generic supabase wrapper message.
        const ctx: any = (error as any)?.context;
        let body: any = null;
        try { body = ctx?.body ? (typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body) : null; } catch { /* noop */ }
        const enriched: any = new Error(
          body?.error || error.message || "Upload failed",
        );
        enriched.code = body?.code;
        enriched.hint = body?.hint;
        enriched.diagnostics = body?.diagnostics;
        throw enriched;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pdf-uploads'] });
      const goalsUsed = data.goals_applied;
      const diag = data?.diagnostics;
      const extras: string[] = [];
      if (diag?.validation?.warnings?.length) {
        const unrecovered = diag.validation.warnings.filter((w: any) => !w.recovered).length;
        if (unrecovered > 0) extras.push(`${unrecovered} lot${unrecovered > 1 ? "s" : ""} flagged for review`);
      }
      if (diag?.tavily && diag.tavily.ok === false) {
        extras.push("research data unavailable — confidence reduced");
      }
      const extraSuffix = extras.length ? ` (${extras.join("; ")})` : "";
      toast({
        title: goalsUsed ? "Analysis completed based on your goals!" : "PDF Processed!",
        description: `Successfully extracted ${data.extracted_data?.horses?.length || 0} horses from the catalog.${goalsUsed ? ` ${data.goal_matches || 0} matched your criteria.` : ''}${extraSuffix}`,
      });
    },
    onError: (error: any) => {
      const code = error?.code ? ` [${error.code}]` : "";
      const hint = error?.hint ? `\n${error.hint}` : "";
      toast({
        title: `Upload Failed${code}`,
        description: `${error?.message || "Failed to process PDF"}${hint}`,
        variant: "destructive",
      });
    },
  });

  return { uploadPDF };
};

export const usePDFUploads = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['pdf-uploads', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('pdf_uploads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useFileUrl = () => {
  const getFileUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('pdf-uploads')
      .createSignedUrl(filePath, 60); // URL válida por 60 segundos

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  };

  return { getFileUrl };
};

export const useDeleteUpload = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteUpload = useMutation({
    mutationFn: async ({ uploadId, filePath }: { uploadId: string; filePath: string }) => {
      // 1. Remove arquivo do Storage
      const { error: storageError } = await supabase.storage
        .from('pdf-uploads')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continua mesmo se falhar no storage (arquivo pode não existir)
      }

      // 2. Remove dados extraídos relacionados
      await supabase
        .from('extracted_data')
        .delete()
        .eq('source_id', uploadId);

      // 3. Remove registro do banco pdf_uploads
      const { error: dbError } = await supabase
        .from('pdf_uploads')
        .delete()
        .eq('id', uploadId);

      if (dbError) throw dbError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-uploads'] });
      toast({
        title: "File removed",
        description: "The upload was deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to remove the file",
        variant: "destructive",
      });
    },
  });

  return { deleteUpload };
};
