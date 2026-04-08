using System;
using System.IO;
using System.Text;

// Simple PDF text extraction attempt
string pdfPath = @"c:\Users\Tahmid\Desktop\PAGE-MAIN\pdfs\CSE 211 Previous Year Questions.pdf";
byte[] buffer = new byte[4096];

using (FileStream fs = new FileStream(pdfPath, FileMode.Open, FileAccess.Read))
{
    StringBuilder text = new StringBuilder();
    int bytesRead;
    
    while ((bytesRead = fs.Read(buffer, 0, buffer.Length)) > 0)
    {
        // Extract printable ASCII characters
        foreach (byte b in buffer)
        {
            if (b >= 32 && b <= 126) // Printable ASCII
                text.Append((char)b);
            else if (b is (byte)'\n' or (byte)'\r')
                text.Append((char)b);
        }
    }
    
    // Print first 5000 characters
    string result = text.ToString();
    int limit = Math.Min(5000, result.Length);
    Console.WriteLine(result.Substring(0, limit));
}
