import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateGarmentRequestSchema,
  GarmentSchema,
  ImageUploadTicketSchema,
  ListGarmentsResponseSchema,
  UpdateGarmentRequestSchema,
  type CreateGarmentRequest,
  type Garment,
  type UpdateGarmentRequest,
} from '@fashion-saavy/contracts';
import type { PickedPhoto } from '../platform/photos';
import { ApiError, apiRequest, send } from './client';

export const garmentKeys = {
  all: ['garments'] as const,
};

export function listGarments(): Promise<Garment[]> {
  return apiRequest('/v1/garments', { schema: ListGarmentsResponseSchema }).then((res) => res.garments);
}

export function getGarment(id: string): Promise<Garment> {
  return apiRequest(`/v1/garments/${encodeURIComponent(id)}`, { schema: GarmentSchema });
}

/** Requests an upload ticket and sends the photo to it. Returns the image id to attach to a garment. */
export async function uploadPhoto(photo: PickedPhoto): Promise<string> {
  const ticket = await apiRequest('/v1/garment-images', { method: 'POST', schema: ImageUploadTicketSchema });
  if (!ticket.acceptedTypes.includes(photo.mimeType)) {
    throw new ApiError(415, 'unsupported_media_type', "This photo format isn't supported. Try a different photo.");
  }

  const form = new FormData();
  for (const [name, value] of Object.entries(ticket.fields)) form.append(name, value);
  // React Native's FormData streams a local file from { uri, name, type }.
  form.append(ticket.fileField, { uri: photo.uri, name: 'garment.jpg', type: photo.mimeType } as unknown as Blob);
  await send(ticket.url, { method: 'POST', body: form });
  return ticket.imageId;
}

export function useGarments() {
  return useQuery({ queryKey: garmentKeys.all, queryFn: listGarments });
}

export function useGarment(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...garmentKeys.all, id],
    queryFn: () => getGarment(id),
    // Show the list's copy instantly when we have it; the detail request refreshes it.
    initialData: () => queryClient.getQueryData<Garment[]>(garmentKeys.all)?.find((g) => g.id === id),
  });
}

export function useCreateGarment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ draft, photo }: { draft: Omit<CreateGarmentRequest, 'imageId'>; photo: PickedPhoto }) => {
      const imageId = await uploadPhoto(photo);
      const body = CreateGarmentRequestSchema.parse({ ...draft, imageId });
      return apiRequest('/v1/garments', { method: 'POST', body, schema: GarmentSchema });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: garmentKeys.all }),
  });
}

export function useUpdateGarment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ patch, photo }: { patch: UpdateGarmentRequest; photo: PickedPhoto | null }) => {
      const imageId = photo ? await uploadPhoto(photo) : undefined;
      const body = UpdateGarmentRequestSchema.parse(imageId ? { ...patch, imageId } : patch);
      return apiRequest(`/v1/garments/${encodeURIComponent(id)}`, { method: 'PATCH', body, schema: GarmentSchema });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: garmentKeys.all }),
  });
}

export function useDeleteGarment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest(`/v1/garments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [...garmentKeys.all, id] });
      return queryClient.invalidateQueries({ queryKey: garmentKeys.all });
    },
  });
}
