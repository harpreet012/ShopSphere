const Spinner = ({ size = 'md', full = false }) => {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-2', lg: 'h-12 w-12 border-[3px]' };
  const spinner = <div className={`${sizes[size]} rounded-full border-primary border-t-transparent animate-spin`} />;
  if (full) {
    return <div className="w-full py-16 flex items-center justify-center">{spinner}</div>;
  }
  return spinner;
};
export default Spinner;
