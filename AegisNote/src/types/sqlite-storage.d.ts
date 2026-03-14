declare module 'react-native-sqlite-storage' {
  export interface SQLiteDatabase {
    close(
      successCallback?: (result: any) => void,
      errorCallback?: (err: Error) => void
    ): void;
    executeSql(
      sql: string,
      params?: any[],
      successCallback?: (result: any) => void,
      errorCallback?: (err: Error) => void
    ): void;
  }

  const openDatabase: (
    name: string,
    key?: string,
    createCallback?: () => void,
    errorCallback?: (err: Error) => void
  ) => SQLiteDatabase;

  export default openDatabase;
}
