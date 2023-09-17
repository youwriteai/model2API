export interface Model {
  name: string;
  loaded: boolean;
}

export interface ServiceExample {
  title?: string;
  description?: string;

  /** Curl example, optional */
  curl?: string;

  /** URL path also known as pathname, excluding basePath */
  urlPath: string;

  /** Example body */
  body?: Record<
    string,
    {
      defaultValue?: string | number | string[] | number[];
      type?: 'text' | 'password' | 'checkbox' | 'file' | 'select' | 'object';
      options?: string[];

      /** incase of type = "file" you can use this to determine if it accepts multiple files */
      multiple?: boolean;

      /** incase of type = "file" you can use this to determine what files to accepts */
      accept?: string;
    }
  >;

  /** Types of files that can be uploaded */
  fileUploadMimetypes?: string[];

  /** variable name to be used for the file upload */
  fileUploadName?: string;

  /** Method defaults to POST */
  method?: string;

  /** enctype of the form, 'multipart/form-data' */
  enctype?: 'multipart/form-data' | string;
}

export interface ServiceInfo {
  models: Model[];
  description: string;
  examples: ServiceExample[];
}
