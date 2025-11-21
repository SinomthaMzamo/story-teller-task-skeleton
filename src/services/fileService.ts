import { readFile, writeFile } from "fs/promises";
import * as path from "path";

export class FileService {
  /**
   * Reads a JSON file and returns it as a typed object.
   * @param filePath - Relative or absolute path to the file
   */
  static async load<T>(filePath: string): Promise<T> {
    try {
      // Resolve the path to ensure it works relative to where the script is run
      const absolutePath = path.resolve(filePath);

      console.log(`Loading data from: ${absolutePath}`);

      const fileContent = await readFile(absolutePath, "utf-8");
      const data = JSON.parse(fileContent) as T;

      return data;
    } catch (error) {
      console.error(`Error reading file at ${filePath}:`, error);
      throw error; // Re-throw so the calling service knows it failed
    }
  }

  /**
   * Writes data to a JSON file.
   * @param filePath - Destination path
   * @param data - The object to write
   */
  static async dump(filePath: string, data: unknown): Promise<void> {
    try {
      const absolutePath = path.resolve(filePath);

      console.log(`Writing data to: ${absolutePath}`);

      // null, 2 makes the JSON pretty-printed (readable) with 2-space indentation
      const jsonString = JSON.stringify(data, null, 2);

      await writeFile(absolutePath, jsonString, "utf-8");
      console.log("Write successful.");
    } catch (error) {
      console.error(`Error writing file at ${filePath}:`, error);
      throw error;
    }
  }
}
