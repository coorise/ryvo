import { BaseService } from "@/lib/base-service";

type UploadUrlResponse = {
  signedUrl: string;
  path: string;
  token?: string;
};

type SignedReadResponse = {
  signedUrl: string;
};

export class StorageService extends BaseService {
  constructor() {
    super("storage-service");
  }

  async createUploadUrl(
    token: string | null,
    path: string,
    contentType = "image/png",
  ): Promise<UploadUrlResponse> {
    const res = await this.post<UploadUrlResponse>(
      "/v1/upload-url",
      { bucket: "ryvo-storage", path, content_type: contentType },
      token,
    );
    return res;
  }

  async uploadFile(token: string | null, file: File, storagePath: string): Promise<string> {
    const { signedUrl, path, token: uploadToken } = await this.createUploadUrl(
      token,
      storagePath,
      file.type || "application/octet-stream",
    );
    const headers: Record<string, string> = {
      "Content-Type": file.type || "application/octet-stream",
    };
    if (uploadToken) headers["x-upsert"] = "true";
    const put = await fetch(signedUrl, { method: "PUT", headers, body: file });
    if (!put.ok) throw new Error(`Upload failed (${put.status})`);
    return path;
  }

  async uploadPng(token: string | null, file: File, storagePath: string): Promise<string> {
    return this.uploadFile(token, file, storagePath);
  }

  async getSignedReadUrl(token: string | null, path: string, expiresIn = 3600): Promise<string> {
    const res = await this.post<SignedReadResponse>(
      "/v1/signed-read",
      { bucket: "ryvo-storage", path, expires_in: expiresIn },
      token,
    );
    return res.signedUrl;
  }
}

export const storageService = new StorageService();
